import worker from '../../backend/src/worker';

export const onRequest: PagesFunction = async (context) => {
  return worker.fetch(context.request, context.env, context);
};
