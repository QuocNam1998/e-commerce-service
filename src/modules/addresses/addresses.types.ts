export type AddressRecord = {
  id: string;
  userId: string;
  label: string | null;
  name: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
};

export type CreateAddressInput = {
  userId: string;
  label?: string;
  name: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  isDefault?: boolean;
};

export type UpdateAddressInput = {
  label?: string;
  name?: string;
  address?: string;
  city?: string;
  postal?: string;
  country?: string;
  isDefault?: boolean;
};
