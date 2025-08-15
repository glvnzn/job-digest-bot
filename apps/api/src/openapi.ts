import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Digest API',
      version: '1.0.0',
      description: 'API for the Job Digest Bot platform',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://job-digest-api.railway.app' 
          : 'http://localhost:3333',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      schemas: {
        Job: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Senior Software Engineer' },
            company: { type: 'string', example: 'Tech Corp' },
            location: { type: 'string', example: 'San Francisco, CA' },
            description: { type: 'string', example: 'Full-time software engineering role...' },
            relevanceScore: { type: 'number', minimum: 0, maximum: 100, example: 85 },
            url: { type: 'string', format: 'uri', example: 'https://jobs.example.com/123' },
            source: { type: 'string', example: 'LinkedIn' },
            postedDate: { type: 'string', format: 'date-time' },
            salary: { type: 'string', example: '$120k - $180k', nullable: true },
            remote: { type: 'boolean', example: true },
            processed: { type: 'boolean', example: true },
            archived: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'title', 'company', 'relevanceScore', 'processed', 'archived'],
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            googleId: { type: 'string', example: '12345678901234567890' },
            name: { type: 'string', example: 'John Doe', nullable: true },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            isAdmin: { type: 'boolean', example: false },
            settings: { 
              type: 'object',
              additionalProperties: true,
              example: { emailNotifications: true, theme: 'light' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'email', 'googleId', 'isAdmin'],
        },
        JobStage: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', nullable: true, example: null },
            name: { type: 'string', example: 'Interested' },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#3B82F6' },
            sortOrder: { type: 'integer', example: 1 },
            isSystem: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'color', 'sortOrder', 'isSystem'],
        },
        UserJob: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', example: 1 },
            jobId: { type: 'integer', example: 1 },
            stageId: { type: 'integer', example: 1 },
            isTracked: { type: 'boolean', example: true },
            appliedDate: { type: 'string', format: 'date-time', nullable: true },
            interviewDate: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true, example: 'Looks promising, matches my skills' },
            applicationUrl: { type: 'string', format: 'uri', nullable: true },
            contactPerson: { type: 'string', nullable: true, example: 'Jane Smith' },
            salaryExpectation: { type: 'integer', nullable: true, example: 150000 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'userId', 'jobId', 'stageId', 'isTracked'],
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', nullable: true },
            error: { type: 'string', nullable: true },
            message: { type: 'string', nullable: true },
          },
          required: ['success'],
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, example: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
            total: { type: 'integer', minimum: 0, example: 150 },
            totalPages: { type: 'integer', minimum: 0, example: 8 },
          },
          required: ['page', 'limit', 'total', 'totalPages'],
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/**/*.ts'], // Paths to files with OpenAPI annotations
};

export const specs = swaggerJsdoc(options);
export default specs;