const SESSION_KEY = "memento.gate.v2";

export const saveGateSession = () => {
  sessionStorage.setItem(SESSION_KEY, "1");
};

export const loadGateSession = (): boolean => {
  return sessionStorage.getItem(SESSION_KEY) === "1";
};

export const clearGateSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};
