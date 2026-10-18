export const documentTypes = [
  { value: 'receipt', label: 'Receipt / bill' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'warranty_card', label: 'Warranty card' },
  { value: 'manual', label: 'User manual' },
  { value: 'service_record', label: 'Service record' },
  { value: 'other', label: 'Other document' },
];

export function documentTypeLabel(value) {
  return documentTypes.find((type) => type.value === value)?.label || 'Receipt / bill';
}
