'use client';

/**
 * Direct Bluetooth (BLE) connection to a thermal receipt printer, using the
 * Web Bluetooth API and raw ESC/POS commands.
 *
 * There is no single standard GATT profile for cheap thermal receipt
 * printers — every "58mm/80mm Bluetooth POS printer" clone tends to expose
 * whatever writable characteristic its chipset vendor picked. Rather than
 * hardcoding one vendor's UUID (and failing silently on every other
 * printer), this connects to whichever device the user picks and then
 * walks its GATT services looking for the first characteristic that
 * accepts writes — the same heuristic most browser-based ESC/POS-over-BLE
 * tools use for exactly this reason. It won't work with every printer on
 * the market, but it isn't narrowed to one either. "Print via Browser" (see
 * ReceiptModal) remains the reliable universal fallback for anything this
 * can't talk to.
 *
 * Requires Web Bluetooth support — Chrome/Edge on desktop and Android; NOT
 * Safari or iOS Chrome, since iOS doesn't expose Web Bluetooth to any
 * browser engine.
 */

interface BluetoothLike {
  requestDevice(options: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }): Promise<BluetoothDeviceLike>;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServerLike>;
    disconnect(): void;
  };
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface BluetoothRemoteGATTServerLike {
  getPrimaryServices(): Promise<BluetoothServiceLike[]>;
}

interface BluetoothServiceLike {
  getCharacteristics(): Promise<BluetoothCharacteristicLike[]>;
}

interface BluetoothCharacteristicLike {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue(value: Uint8Array): Promise<void>;
  writeValueWithoutResponse?(value: Uint8Array): Promise<void>;
}

export function isBluetoothPrintingSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

let connectedDevice: BluetoothDeviceLike | null = null;
let writeCharacteristic: BluetoothCharacteristicLike | null = null;

export function getConnectedPrinterName(): string | null {
  return connectedDevice?.gatt?.connected ? (connectedDevice.name ?? 'Unnamed printer') : null;
}

/**
 * Opens the browser's device picker, connects to whatever the user chose,
 * and locates a writable characteristic on it. Must be called from a
 * direct user gesture (a click handler) — Web Bluetooth refuses to open
 * the picker otherwise.
 */
export async function connectPrinter(): Promise<string> {
  if (!isBluetoothPrintingSupported()) {
    throw new Error('This browser does not support Bluetooth printing (try Chrome or Edge).');
  }
  const bluetooth = (navigator as unknown as { bluetooth: BluetoothLike }).bluetooth;

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    // Declared so we're allowed to read from them if the chosen device
    // happens to expose one — Web Bluetooth blocks access to any service
    // not named here or in a filter, even after pairing.
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    ],
  });

  if (!device.gatt) {
    throw new Error('This device does not expose a GATT server (is it actually a BLE printer?).');
  }

  device.addEventListener('gattserverdisconnected', () => {
    connectedDevice = null;
    writeCharacteristic = null;
  });

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  let found: BluetoothCharacteristicLike | null = null;
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writable = characteristics.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) {
      found = writable;
      break;
    }
  }

  if (!found) {
    device.gatt.disconnect();
    throw new Error('Connected, but no writable channel was found on this device — it may not be a printer.');
  }

  connectedDevice = device;
  writeCharacteristic = found;
  return device.name ?? 'Unnamed printer';
}

export function disconnectPrinter(): void {
  connectedDevice?.gatt?.disconnect();
  connectedDevice = null;
  writeCharacteristic = null;
}

// ─── ESC/POS command building ────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;

function textBytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

interface ReceiptLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

/** Builds the raw ESC/POS byte stream for a receipt: init → each line with
 *  its own alignment/weight → feed → (best-effort) paper cut. A printer
 *  with no auto-cutter just ignores the cut command harmlessly. */
function buildEscPosReceipt(lines: ReceiptLine[]): Uint8Array {
  const bytes: number[] = [ESC, 0x40]; // ESC @ — initialize

  for (const line of lines) {
    if (line.align === 'center') bytes.push(ESC, 0x61, 0x01);
    else if (line.align === 'right') bytes.push(ESC, 0x61, 0x02);
    else bytes.push(ESC, 0x61, 0x00);

    bytes.push(ESC, 0x45, line.bold ? 0x01 : 0x00); // ESC E — bold on/off

    bytes.push(...textBytes(line.text), 0x0a); // line + \n
  }

  bytes.push(0x0a, 0x0a, 0x0a); // feed for tear-off margin
  bytes.push(GS, 0x56, 0x00); // GS V 0 — best-effort full cut
  return new Uint8Array(bytes);
}

/** BLE writes are capped by whatever MTU the connection negotiated
 *  (frequently as low as ~20 bytes on older stacks) — Web Bluetooth gives
 *  no way to query or raise it, so instead of one large write, this sends
 *  small chunks with a short pause between them, which is what most cheap
 *  thermal printer firmware needs to not drop bytes. */
async function writeChunked(data: Uint8Array, chunkSize = 100, delayMs = 20): Promise<void> {
  if (!writeCharacteristic) throw new Error('No printer connected.');
  const characteristic = writeCharacteristic;
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.slice(offset, offset + chunkSize);
    if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export async function printReceiptViaBluetooth(lines: ReceiptLine[]): Promise<void> {
  if (!connectedDevice?.gatt?.connected || !writeCharacteristic) {
    throw new Error('No printer connected — tap "Connect Printer" first.');
  }
  await writeChunked(buildEscPosReceipt(lines));
}

export type { ReceiptLine };
