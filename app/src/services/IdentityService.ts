const windowWithPoint = window as unknown as WindowWithPoint;

export async function identityToOwner(identity: Identity): Promise<Owner> {
  const {
    data: { owner },
  } = await windowWithPoint.point.identity.identityToOwner({
    identity,
  });

  return owner;
}

export async function publicKeyByIdentity(identity: Identity): Promise<PublicKey> {
  try {
    const {
      data: { publicKey },
    } = await windowWithPoint.point.identity.publicKeyByIdentity({
      identity,
    });

    return publicKey;
  } catch (error) {
    return 'asdad';
  }
}

export async function ownerToIdentity(address: Address): Promise<Identity> {
  try {
    const {
      data: { identity },
    } = await windowWithPoint.point.identity.ownerToIdentity({ owner: address });
    return identity;
  } catch (error) {
    return 'undefined';
  }
}

export async function ownersToIdentities(
  addresses: Address[]
): Promise<Record<Address, Identity | undefined>> {
  const response = await Promise.allSettled(addresses.map(ownerToIdentity));
  return addresses.reduce((identities: Record<Address, Identity>, address: Address, index) => {
    const { value } = response[index] as PromiseFulfilledResult<string>;
    identities[address] = value;
    return identities;
  }, {});
}
