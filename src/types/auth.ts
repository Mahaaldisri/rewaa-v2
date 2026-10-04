/** Auth & account domain types — mirrors the future Authentication API. */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  cityId: string;
  cityName: string;
  district: string;
  street: string;
  buildingNo?: string;
  additionalInfo?: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id" | "isDefault"> & { isDefault?: boolean };
