import express from 'express';

import materialsRouter from './upload/materials.route';
import queryRouter from './query/query.route';
import summarizationRouter from './summarization/summarization.route';
import examEngineRouter from './examEngine/examEngine.route';
import advisorRouter from './advisor/advisor.route';

const aiRouter = express.Router();

aiRouter.use('/materials', materialsRouter);
aiRouter.use('/query', queryRouter);
aiRouter.use('/summarize', summarizationRouter);
aiRouter.use('/exam-engine', examEngineRouter);
aiRouter.use('/advisor', advisorRouter);

export default aiRouter;
