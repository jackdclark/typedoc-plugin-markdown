import * as path from 'path';
import {
  Application,
  TSConfigReader,
  TypeDocOptions,
  TypeDocReader,
} from 'typedoc';
import { load as loadTypedocPluginMarkdown } from 'typedoc-plugin-markdown';
import { PluginOptions } from './models';
import { getPluginOptions } from './options';
import { load as loadDocusaurusTypedocPlugin } from './plugin.typedoc';

// store list of plugin ids when running multiple instances
const apps: string[] = [];

export default function pluginDocusaurus(
  context: any,
  opts: Partial<PluginOptions>,
) {
  return {
    name: 'docusaurus-plugin-typedoc',
    async loadContent() {
      if (opts.id && !apps.includes(opts.id)) {
        apps.push(opts.id);
        generateTypedoc(context, opts);
      }
    },
    extendCli(cli) {
      cli
        .command('generate-typedoc')
        .description(
          '(docusaurus-plugin-typedoc) Generate TypeDoc docs independently of the Docusaurus build process.',
        )
        .action(async () => {
          context.siteConfig?.plugins.forEach((pluginConfig) => {
            // Check PluginConfig is typed to [string, PluginOptions]
            if (pluginConfig && typeof pluginConfig[1] === 'object') {
              generateTypedoc(context, pluginConfig[1]);
            }
          });
        });
    },
  };
}

/**
 * Initiates a new typedoc Application bootstraped with plugin options
 */
async function generateTypedoc(context: any, opts: Partial<PluginOptions>) {
  const { siteDir } = context;

  const options = getPluginOptions(opts);

  const { id, docsRoot, ...optionsPassedToTypeDoc } = options;

  const outputDir = path.resolve(siteDir, options.docsRoot, options.out);

  const app = new Application();

  app.options.addReader(new TypeDocReader());
  app.options.addReader(new TSConfigReader());

  loadTypedocPluginMarkdown(app);
  loadDocusaurusTypedocPlugin(app);

  await app.bootstrapWithPlugins(
    optionsPassedToTypeDoc as unknown as Partial<TypeDocOptions>,
  );

  const project = app.convert();

  // if project is undefined typedoc has a problem - error logging will be supplied by typedoc.
  if (!project) {
    return;
  }

  if (options.watch) {
    app.convertAndWatch(async (project) => {
      await app.generateDocs(project, outputDir);
    });
  } else {
    await app.generateDocs(project, outputDir);
  }
}
