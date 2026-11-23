const card = /^https:\/\/trudvsem\.ru\/vacancy\/card\/([a-z\d-]+)\/([a-z\d-]+)\/?$/i
export function trudKey(url: string) {
  const match = card.exec(url)
  return match ? match[1]+':'+match[2] : null
}
export function registryUrl(key: string) {
  const match=/^([a-z\d-]{1,64}):([a-z\d-]{1,64})$/i.exec(key)
  return match ? 'https://opendata.trudvsem.ru/api/v1/vacancies/vacancy/'+match[1]+'/'+match[2] : null
}
