const windowWithPoint = window as unknown as WindowWithPoint;

type StoredStringId = string;

export async function putString(data: string): Promise<StoredStringId> {
  const { data: storedStringId } = await windowWithPoint.point.storage.putString({
    data,
  });

  return storedStringId;
}

export async function getString(storedStringId: StoredStringId): Promise<string> {
  const { data: storedString } = await windowWithPoint.point.storage.getString({
    id: storedStringId,
  });

  return storedString;
}

export async function putFile(file: File) {
  const response = await windowWithPoint.point.storage.putFile(file);
  return response;
}

export async function postFile(file: any) {
  const response = await windowWithPoint.point.storage.postFile(file);
  return response;
}
