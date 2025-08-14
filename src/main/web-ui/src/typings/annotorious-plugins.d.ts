// src/typings/annotorious-plugins.d.ts

declare module '@recogito/annotorious-selector-pack' {
  export type SelectorTool =
    | 'point'
    | 'circle'
    | 'ellipse'
    | 'freehand'
    | 'multipolygon';

  export interface SelectorPackOptions {
    tools?: SelectorTool[];
  }

  const plugin: (annotorious: any, options?: SelectorPackOptions) => void;
  export default plugin;
}

declare module '@recogito/annotorious-better-polygon' {
  const plugin: (annotorious: any) => void;
  export default plugin;
}
