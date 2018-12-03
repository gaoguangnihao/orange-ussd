/* global jest */
global.localStorage = {
  removeItem: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn()
};
