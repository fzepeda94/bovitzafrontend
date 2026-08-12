export const MENSAJE_ANTECEDENTE_REPRODUCTIVO =
  'Este registro documenta un parto ocurrido antes de la incorporación del animal a BovItzá. No creará crías ni modificará el inventario.'

export const endpointAntecedentesReproductivos = (animalId: string) =>
  `/animales/${animalId}/expediente/antecedentes-partos`
