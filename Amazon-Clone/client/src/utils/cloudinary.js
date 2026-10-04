const UPLOAD_SEGMENT = '/image/upload/'

/**
 * Adds Cloudinary delivery transforms to an uploaded image URL.
 * Non-Cloudinary URLs are returned unchanged.
 * @param {string} url Cloudinary `secure_url`
 * @param {{ w?: number, h?: number }} [size] Display size in CSS pixels
 */
export function imageUrl(url, { w, h } = {}) {
  if (!url?.includes(UPLOAD_SEGMENT)) return url
  const transforms = ['f_auto', 'q_auto', 'c_limit', w && `w_${w}`, h && `h_${h}`].filter(Boolean)
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${transforms.join(',')}/`)
}

export function imageSrcSet(url, width) {
  return `${imageUrl(url, { w: width })} 1x, ${imageUrl(url, { w: width * 2 })} 2x`
}
