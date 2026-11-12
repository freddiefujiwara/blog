import { vi } from "vitest";

// Vitest 5 のテスト環境では import.meta.env.BASE_URL が vite の base を
// 反映しないため、本番値（vite.config の base）を明示する。
vi.stubEnv("BASE_URL", "/blog/");
