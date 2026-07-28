import type { Pagination } from '../store/collection.store';

type PaginationDto = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export const toPagination = (dto: PaginationDto): Pagination => ({
  page: dto.page,
  pageSize: dto.page_size,
  total: dto.total,
  totalPages: dto.total_pages,
  hasNext: dto.has_next,
  hasPrevious: dto.has_previous,
});
