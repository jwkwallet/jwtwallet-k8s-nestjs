export const KubeConfig = jest.fn().mockImplementation(() => ({
  loadFromDefault: jest.fn(),
  makeApiClient: jest.fn()
}));

export const CustomObjectsApi = jest.fn().mockImplementation(() => ({
  createNamespacedCustomObject: jest.fn(),
  getNamespacedCustomObject: jest.fn()
}));