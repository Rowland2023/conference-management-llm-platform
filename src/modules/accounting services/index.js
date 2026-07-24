function createPresentationApp(controllers) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));

  // Auth once — globally
  app.use(authMiddleware);

  app.use('/v1/accounts', createAccountRoutes(controllers.accountController));
  app.use('/v1/journal-entries', createJournalRoutes(controllers.journalController));
  app.use('/v1/holds', createHoldRoutes(controllers.holdController));

  app.use((req, res) => res.status(404).json({ 
    success: false, 
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found`, correlationId: req.correlationId } 
  }));

  app.use(errorHandler);
  return app;
}