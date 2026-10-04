import { readJSON, writeJSON } from "@/lib/localStore";
import { summaryBySlug } from "@/data/catalog";
import {
  DEFAULT_REMINDER_CHANNELS,
  defaultIntervalMonths,
  planFor,
  type CustomerDevice,
  type MaintenancePlan,
  type ReminderChannels,
} from "@/lib/maintenance";
import { env } from "@/config/env";

/**
 * Maintenance centre data access.
 *
 * Devices are stored through the shared localStore layer today; the method
 * signatures match a REST backend (`GET/POST/PATCH/DELETE /v1/me/devices`) so
 * replacing the bodies is the only change needed when the API exists.
 */

const DEVICES_KEY = "rewaa_devices";
const CHANNELS_KEY = "rewaa_reminder_channels";

function delay(ms = 320): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readDevices(): CustomerDevice[] {
  return readJSON<CustomerDevice[]>(DEVICES_KEY, []);
}

function writeDevices(devices: CustomerDevice[]): void {
  writeJSON(DEVICES_KEY, devices.slice(0, 20));
}

export interface AddDeviceInput {
  deviceSlug: string;
  installedAt: string;
  lastCartridgeChange: string;
  serial?: string;
  city?: string;
  cartridgeSetSlug?: string;
  intervalMonths?: number;
}

export interface DeviceWithPlan {
  device: CustomerDevice;
  plan: MaintenancePlan;
}

export const maintenanceApi = {
  async list(): Promise<DeviceWithPlan[]> {
    await delay(240);
    return readDevices().map((device) => ({ device, plan: planFor(device) }));
  },

  async add(input: AddDeviceInput): Promise<DeviceWithPlan> {
    await delay(420);
    const summary = summaryBySlug(input.deviceSlug);
    const device: CustomerDevice = {
      id: `dev_${Date.now().toString(36)}`,
      deviceSlug: input.deviceSlug,
      deviceName: summary?.name ?? input.deviceSlug,
      serial: input.serial,
      city: input.city,
      installedAt: input.installedAt,
      lastCartridgeChange: input.lastCartridgeChange,
      intervalMonths: input.intervalMonths ?? defaultIntervalMonths(input.deviceSlug),
      cartridgeSetSlug: input.cartridgeSetSlug,
      reminderChannels: readJSON<ReminderChannels>(CHANNELS_KEY, DEFAULT_REMINDER_CHANNELS),
      createdAt: new Date().toISOString(),
    };
    const devices = readDevices();
    writeDevices([device, ...devices]);
    return { device, plan: planFor(device) };
  },

  /** Records that the cartridges were replaced (updates the schedule). */
  async recordChange(id: string, changedAt: string): Promise<DeviceWithPlan | undefined> {
    await delay(280);
    const devices = readDevices();
    const index = devices.findIndex((device) => device.id === id);
    if (index === -1) return undefined;
    const updated: CustomerDevice = { ...devices[index], lastCartridgeChange: changedAt };
    devices[index] = updated;
    writeDevices(devices);
    return { device: updated, plan: planFor(updated) };
  },

  async updateChannels(id: string, channels: Partial<ReminderChannels>): Promise<DeviceWithPlan | undefined> {
    await delay(260);
    const devices = readDevices();
    const index = devices.findIndex((device) => device.id === id);
    if (index === -1) return undefined;
    const updated: CustomerDevice = {
      ...devices[index],
      reminderChannels: { ...devices[index].reminderChannels, ...channels },
    };
    devices[index] = updated;
    writeDevices(devices);
    writeJSON(CHANNELS_KEY, updated.reminderChannels);
    return { device: updated, plan: planFor(updated) };
  },

  async remove(id: string): Promise<{ id: string }> {
    await delay(220);
    writeDevices(readDevices().filter((device) => device.id !== id));
    return { id };
  },

  /** True when reminder delivery can actually happen in this build. */
  reminderDeliveryConfigured(): boolean {
    // No provider is wired yet: the account screen must never claim a send.
    return env.api.configured && !env.mock.enabled;
  },
};
