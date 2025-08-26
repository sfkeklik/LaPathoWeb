export const API_VERSION = '/api';

// Check if we're in a browser environment and get the current host
const getApiEndpoint = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    console.log('🔍 API Gateway Debug:', {
      hostname,
      protocol,
      fullURL: window.location.href
    });

    // If accessing via localhost or 127.0.0.1, keep the original behavior
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const endpoint = 'http://localhost:8080';
      console.log('🌐 Using localhost endpoint:', endpoint);
      return endpoint;
    }

    // For remote access, use the same hostname but port 8080 for API
    const endpoint = `${protocol}//${hostname}:8080`;
    console.log('🌐 Using remote endpoint:', endpoint);
    return endpoint;
  }

  // Fallback for server-side rendering or non-browser environments
  console.log('🌐 Using fallback endpoint: http://localhost:8080');
  return 'http://localhost:8080';
};

export const API_ENDPOINT = getApiEndpoint();
export const API_ENDPOINTWITHVERSION = API_ENDPOINT + API_VERSION;

console.log('✅ API Configuration initialized:', {
  API_ENDPOINT,
  API_ENDPOINTWITHVERSION
});

export const ApiGateway = {
    api: API_ENDPOINTWITHVERSION,
    imagesPath: "/images",
    tilesPath: "/tiles",
    annotationPath: "/annotations"
  };

  export const ImagesApi = {
    uploadImage: ApiGateway.api + ApiGateway.imagesPath + "/upload",
    getImageStatus: ApiGateway.api + ApiGateway.imagesPath + "/status/",
    getImageMetadata: ApiGateway.api + ApiGateway.imagesPath + "/metadata/",
    getImagesList: ApiGateway.api + ApiGateway.imagesPath + "/get-images-list",
    updateImage: ApiGateway.api + ApiGateway.imagesPath + "/",
    deleteImage: ApiGateway.api + ApiGateway.imagesPath + "/",
    getImageById: ApiGateway.api + ApiGateway.imagesPath + "/",
  };

  export const TilesApi = {
    getTileByIdLevel: ApiGateway.api + ApiGateway.tilesPath + "/",
  };

  export const AnnotationApi = {
    getAnnotations: ApiGateway.api + "/images/annotations/",
    saveAnnotation: ApiGateway.api + "/images/annotations/",
    updateAnnotation: ApiGateway.api + "/images/annotations/",
    deleteAnnotation: ApiGateway.api + "/images/annotations/",
    // Standalone annotation endpoints
    getAllAnnotations: ApiGateway.api + ApiGateway.annotationPath,
    getAnnotationById: ApiGateway.api + ApiGateway.annotationPath + "/",
    createAnnotationStandalone: ApiGateway.api + ApiGateway.annotationPath,
    updateAnnotationStandalone: ApiGateway.api + ApiGateway.annotationPath + "/",
    deleteAnnotationStandalone: ApiGateway.api + ApiGateway.annotationPath + "/",
  };
