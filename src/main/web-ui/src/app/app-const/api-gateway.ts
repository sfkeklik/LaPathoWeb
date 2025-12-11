export const API_VERSION = '/api';

// Use relative URLs to work with Angular proxy in development
// In production, the backend serves the frontend, so relative URLs still work
const getApiEndpoint = (): string => {
  // Always use relative URL - proxy will handle it in development
  // In production, same origin will be used
  return '';
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
