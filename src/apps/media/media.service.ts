export class MediaService {
    uploadFile = async (file: any): Promise<any> => {
      return {
        statusCode: 201,
        message: file.destination + file.filename,
      };
    };
  }
  