import { Request, Response } from 'express';
import { Settings } from '../models';

// Get all settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await Settings.findAll();
    
    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.getTypedValue();
      return acc;
    }, {} as any);
    
    res.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Ayarlar alınırken hata oluştu',
      },
    });
  }
};

// Update settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      // Determine type
      let type = 'string';
      if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'number') type = 'number';
      else if (typeof value === 'object') type = 'json';
      
      // Convert value to string for storage
      let stringValue: string;
      if (type === 'json') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      // Determine category based on key
      let category: 'general' | 'security' | 'notifications' | 'appearance' = 'general';
      if (key.includes('Color') || key.includes('Theme')) {
        category = 'appearance';
      } else if (key.includes('notification') || key.includes('email')) {
        category = 'notifications';
      } else if (key.includes('maintenance') || key.includes('registration') || key.includes('session')) {
        category = 'security';
      }
      
      // Update or create setting
      await Settings.upsert({
        key,
        value: String(stringValue),
        type: type as any,
        category,
      });
    }
    
    // Get all settings after update
    const settings = await Settings.findAll();
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.getTypedValue();
      return acc;
    }, {} as any);
    
    res.json({
      success: true,
      message: 'Ayarlar güncellendi',
      data: settingsObj,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Ayarlar güncellenirken hata oluştu',
        details: error.message,
      },
    });
  }
};

// Get settings by category
export const getSettingsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    const settings = await Settings.findAll({
      where: { category },
    });
    
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.getTypedValue();
      return acc;
    }, {} as any);
    
    res.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Ayarlar alınırken hata oluştu',
      },
    });
  }
};