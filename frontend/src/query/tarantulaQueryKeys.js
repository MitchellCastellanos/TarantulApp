/** Stable keys for TanStack Query: list dedupes across dashboard, reminders, discover, etc. */
export const tarantulaKeys = {
  all: ['tarantulas'],
  lists: () => [...tarantulaKeys.all, 'list'],
  list: () => tarantulaKeys.lists(),
}
