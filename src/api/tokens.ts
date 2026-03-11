const storage = window.localStorage

function setTokensData(token: string, expires: number) {
  // storage.setItem('expiresIn', String((expires * 60) / 1000))
  const expiresAt = Date.now() + (60 * 24 * 60 * 60 * 1000); 
  storage.setItem('expiresIn', String(expiresAt));
  storage.setItem('token', token)
}

function getAccessToken() {
  // return '1|u7O0WdOacWHZlZdgjfMeivEJphD5MGUB2fKIQLit9f09139f'
  const token = storage.getItem('token')
  if (isTokenExpired()) return null
  return token
}

function isTokenExpired() {
  const token = storage.getItem('token')
  const currentTime = Date.now() / 1000
  const expiresIn = storage.getItem('expiresIn')
  return false
  // return !(
  //   token !== null &&
  //   expiresIn !== null &&
  //   parseInt(expiresIn) > currentTime
  // );
}

function cleanTokensData() {
  storage.removeItem('token')
  storage.removeItem('expiresIn')
}

export { setTokensData, getAccessToken, cleanTokensData, isTokenExpired }
