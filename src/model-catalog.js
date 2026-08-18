export async function listAvailableModels(ctx) {
  const selected = ctx.agentDefaultModel.currentSelection()
  const providers = await Promise.all(ctx.llm.listProviders().map(async provider => ({
    id: provider.id,
    name: provider.name,
    models: await ctx.llm.listModels(provider.id),
  })))
  return {
    selected,
    models: providers.flatMap(provider => provider.models.map(model => ({
      provider: provider.id,
      model: model.id,
      name: `${provider.name} · ${model.name}`,
    }))),
  }
}
