/** 验证页阶段机：booting 等 banner；closing 为离开画廊后的关门；unlocking 解锁过场后才 emit */
export type GatePhase =
  | "booting"
  | "intro"
  | "form"
  | "closing"
  | "unlocking"
  | "done";

export type GateFormModel = {
  secret: string;
};

export type GateFieldKey = keyof GateFormModel;

export type GateFieldError = {
  field: GateFieldKey | null;
  message: string;
};

/** canvas 极光层暴露给编排层的命令式接口 */
export type GateAuroraHandle = {
  /** 在视口坐标处炸开一圈冲击波与粒子 */
  burst: (clientX: number, clientY: number) => void;
};
