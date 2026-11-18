/** Both switch entry points change linked tour and travel-order views. */
export async function invalidateCrewSwitchViews(client: { invalidateQueries: (options: { queryKey: string[] }) => Promise<unknown> }): Promise<void> {
  await Promise.all(["tours", "tour-details", "dashboard", "travel-orders", "travel-order-lines"].map(key =>
    client.invalidateQueries({ queryKey: [key] }),
  ));
}
