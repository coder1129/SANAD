import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginationDto, createPaginatedResponse } from './pagination';

const parse = (query: Record<string, unknown>) =>
  plainToInstance(PaginationDto, query, { enableImplicitConversion: true });

describe('PaginationDto', () => {
  it('defaults to the first page with 20 rows', () => {
    const dto = parse({});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.skip).toBe(0);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('derives skip from the requested page', () => {
    expect(parse({ page: 3, limit: 25 }).skip).toBe(50);
    expect(parse({ page: 1, limit: 25 }).skip).toBe(0);
  });

  it('coerces numeric query strings', () => {
    const dto = parse({ page: '4', limit: '10' });

    expect(dto.page).toBe(4);
    expect(dto.limit).toBe(10);
    expect(dto.skip).toBe(30);
  });

  it('rejects a page below one', () => {
    expect(validateSync(parse({ page: 0 }))).not.toHaveLength(0);
  });

  // Without this ceiling a single request could ask for the whole table.
  it('rejects a limit above 100', () => {
    expect(validateSync(parse({ limit: 101 }))).not.toHaveLength(0);
    expect(validateSync(parse({ limit: 100 }))).toHaveLength(0);
  });

  it('rejects a non-integer page', () => {
    expect(validateSync(parse({ page: 1.5 }))).not.toHaveLength(0);
  });

  it('rejects a sort direction outside asc/desc', () => {
    expect(validateSync(parse({ sortOrder: 'sideways' }))).not.toHaveLength(0);
    expect(validateSync(parse({ sortOrder: 'asc' }))).toHaveLength(0);
  });
});

describe('createPaginatedResponse', () => {
  it('wraps items in the standard envelope with page metadata', () => {
    const result = createPaginatedResponse([{ id: 1 }, { id: 2 }], 42, 2, 20);

    expect(result).toEqual({
      success: true,
      data: {
        items: [{ id: 1 }, { id: 2 }],
        meta: { page: 2, limit: 20, total: 42, totalPages: 3 },
      },
      message: null,
    });
  });

  it('rounds the page count up for a partial final page', () => {
    expect(createPaginatedResponse([], 21, 1, 20).data.meta.totalPages).toBe(2);
    expect(createPaginatedResponse([], 40, 1, 20).data.meta.totalPages).toBe(2);
  });

  it('reports zero pages for an empty result set', () => {
    const result = createPaginatedResponse([], 0, 1, 20);

    expect(result.data.meta.totalPages).toBe(0);
    expect(result.data.items).toEqual([]);
  });
});
