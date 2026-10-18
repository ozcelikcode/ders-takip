import { NextFunction, Request, Response } from 'express';
import * as catalog from '../services/catalog';
import { listTopicProgress, setTopicProgress } from '../services/topicProgress';

export const createTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await catalog.createTopic(req.user!, req.body);
    res.status(201).json({ success: true, message: 'Konu başarıyla oluşturuldu', data: { topic } });
  } catch (error) { next(error); }
};

export const updateTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await catalog.updateTopic(req.user!, Number(req.params.id), req.body);
    res.json({ success: true, message: 'Konu başarıyla güncellendi', data: { topic } });
  } catch (error) { next(error); }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await catalog.deleteTopic(req.user!, Number(req.params.id));
    res.json({ success: true, message: 'Konu arşivlendi. Çalışma geçmişi korundu' });
  } catch (error) { next(error); }
};

export const reorderTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topics = await catalog.reorderTopics(req.user!, Number(req.params.courseId), req.body);
    res.json({ success: true, message: 'Konu sıralaması başarıyla güncellendi', data: { topics } });
  } catch (error) { next(error); }
};

export const getTopicProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: { progress: await listTopicProgress(req.user!) } }); } catch (error) { next(error); }
};

export const updateTopicProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: { progress: await setTopicProgress(req.user!, Number(req.params.id), req.body.status) } }); } catch (error) { next(error); }
};
