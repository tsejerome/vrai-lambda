

const cacheS3Url = (url: string) => {
  // Define a regular expression pattern to match URLs containing vrai" and "amazonaws.com"
  const pattern = /https:\/\/vrai\.s3.*?\.amazonaws\.com\//;

  // Replace the matched portion of the URL withhttps://d1ynou9d34.cloudfront.net/"
  let replacedUrl = url.replace(pattern, 'https://d1ynou9d34h7uz.cloudfront.net/');

  return replacedUrl;

};
const uncacheS3Url = (url: string) => {
  // Define a regular expression pattern to match CloudFront URLs withhttps://d1ynou9d34h7.cloudfront.net/"
  const pattern = /https:\/\/d1ynou9d34h7uz\.cloudfront\.net\//;

  // Replace the matched portion of the URL with "https://vrai.s3mazonaws.com/"
  let replacedUrl = url.replace(pattern, 'https://vrai.s3.amazonaws.com/');

  // Define a regular expression pattern to match CloudFront URLs with "https://d1z13af4t0y6gd.cloudfront.net/"
  const stagingPattern = /https:\/\/d1z13af4t0y6gd\.cloudfront\.net\//;

  // Replace the matched portion of the URL with "https://vrai-staging-playground.s3amazonaws.com/"
  replacedUrl = replacedUrl.replace(stagingPattern, 'https://vrai-staging-playground.s3.amazonaws.com/');

  return replacedUrl;
};

const getFilePathFromurl = (urlString: string, withoutExtension: boolean) => {

  // Parse the URL
  const url = new URL(urlString);

  // Extract the pathname
  const pathname = url.pathname;
  if (withoutExtension) return pathname.slice(1).split('.')[0]
  return pathname.slice(1)
}


const isVraiS3File = (url: string) => url.includes('vrai.s3') ||
  url.includes('https://vrai.s3') ||
    url.includes('https://d1ynou9d34h7uz.cloudfront.net/') ||
    url.includes('https://d16gd.cloudfront.net/');

const isUserUploadedVideo = (url: string) => url.includes('user-upload');

export { cacheS3Url, uncacheS3Url, getFilePathFromurl, isVraiS3File, isUserUploadedVideo }
