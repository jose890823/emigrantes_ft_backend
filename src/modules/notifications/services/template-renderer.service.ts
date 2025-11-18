import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);
  private readonly templatesPath = path.join(
    __dirname,
    '..',
    'templates',
    'email',
  );
  private readonly layoutsPath = path.join(__dirname, '..', 'templates', 'layouts');
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private compiledLayouts: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
  }

  /**
   * Registra helpers de Handlebars personalizados
   */
  private registerHelpers() {
    // Helper para formatear fechas
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Helper para formatear moneda
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    });

    // Helper para capitalizar texto
    Handlebars.registerHelper('capitalize', (text: string) => {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    });

    // Helper condicional
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
  }

  /**
   * Renderiza un template de email con los datos proporcionados
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, any>,
    layoutName: string = 'base',
  ): Promise<string> {
    try {
      // Compilar layout si no está en caché
      if (!this.compiledLayouts.has(layoutName)) {
        const layoutPath = path.join(this.layoutsPath, `${layoutName}.hbs`);
        const layoutContent = await fs.promises.readFile(layoutPath, 'utf-8');
        this.compiledLayouts.set(layoutName, Handlebars.compile(layoutContent));
      }

      // Compilar template si no está en caché
      if (!this.compiledTemplates.has(templateName)) {
        const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
        const templateContent = await fs.promises.readFile(
          templatePath,
          'utf-8',
        );
        this.compiledTemplates.set(
          templateName,
          Handlebars.compile(templateContent),
        );
      }

      // Renderizar template
      const templateCompiled = this.compiledTemplates.get(templateName);
      if (!templateCompiled) {
        throw new Error(`Template ${templateName} not found in cache`);
      }
      const templateHtml = templateCompiled(data);

      // Renderizar layout con el contenido del template
      const layoutCompiled = this.compiledLayouts.get(layoutName);
      if (!layoutCompiled) {
        throw new Error(`Layout ${layoutName} not found in cache`);
      }
      const finalHtml = layoutCompiled({
        ...data,
        content: templateHtml,
        year: new Date().getFullYear(),
      });

      this.logger.debug(
        `Template '${templateName}' renderizado exitosamente`,
      );
      return finalHtml;
    } catch (error) {
      this.logger.error(
        `Error renderizando template '${templateName}': ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Limpia la caché de templates (útil en desarrollo)
   */
  clearCache() {
    this.compiledTemplates.clear();
    this.compiledLayouts.clear();
    this.logger.log('Caché de templates limpiada');
  }
}
