// jest.setup.js
require("@testing-library/jest-dom");

// Mock Next.js modules
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));
