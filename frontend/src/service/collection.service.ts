export const getCollections = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_SERVER_URL}/collections`,
    {
      method: 'GET',
    },
  );
  const responseData = await response.json();
  return responseData;
};

export const getCollectionByName = async (collectionName: string) => {
  const response = await fetch(
    `${import.meta.env.VITE_SERVER_URL}/collections/${collectionName}`,
    {
      method: 'GET',
    },
  );
  const responseData = await response.json();
  return responseData;
};
