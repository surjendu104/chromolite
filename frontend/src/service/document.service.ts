export const getDocuments = async (
  collectionName: string,
  page: number,
  pageSize: number,
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const response = await fetch(
    `${import.meta.env.VITE_SERVER_URL}/collections/${collectionName}/documents?${params}`,
  );

  return response.json();
};
