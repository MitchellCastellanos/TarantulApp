import api from './api'
import publicApi from './publicApi'

const speciesService = {
  getAll: () => api.get('/species').then(r => r.data),
  getById: (id) => api.get(`/species/${id}`).then(r => r.data),
  search: (q) => api.get('/species', { params: { q } }).then(r => r.data),
  /** Misma lista que usa “Agregar tarántula” en catálogo local: GET /api/species?publicCatalog=true */
  getDiscoverCatalog: (q) =>
    publicApi
      .get('/species', { params: { publicCatalog: true, ...(q ? { q } : {}) } })
      .then((r) => r.data),
  /** Ficha Descubrir con foto iNat fallback si existe; si falla, solo SpeciesDTO. */
  async getDiscoverSpeciesView(id) {
    try {
      return await publicApi.get('/species/catalog-view', { params: { id } }).then((r) => r.data)
    } catch {
      const species = await publicApi.get(`/species/${id}`).then((r) => r.data)
      return { species, fallbackPhoto: null }
    }
  },
  discoverTaxon: (gbifKey) =>
    publicApi.get('/species/discover-taxon', { params: { gbifKey } }).then((r) => r.data),
  /** {@code { speciesId: number | null }} — ficha de cuidados en catálogo público para esa clave GBIF. */
  getPublicSpeciesIdByGbif: (gbifKey) =>
    publicApi.get('/species/public-id-by-gbif', { params: { gbifKey } }).then((r) => r.data),
  /** Sin JWT: invitado en Descubrir y token caducado no deben provocar 401 en Spring. */
  searchGbif: (q) => publicApi.get('/gbif/search', { params: { q } }).then((r) => r.data),
  importFromGbif: (key) => api.post(`/gbif/${key}/import`).then(r => r.data),
  searchWsc: (q) => publicApi.get('/wsc/search', { params: { q } }).then((r) => r.data),
  importFromWsc: (name, family) => api.post('/wsc/import', { name, family }).then(r => r.data),
}

export default speciesService
