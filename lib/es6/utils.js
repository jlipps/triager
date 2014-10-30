function mapToObject (map) {
  let obj = {};
  for (let [k, v] of map) {
    if (v instanceof Map) {
      obj[k] = mapToObject(v);
    } else {
      obj[k] = v;
    }
  }
  return obj;
};

export { mapToObject };
