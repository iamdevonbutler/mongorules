const self = module.exports;

self.exit = () => {
  console.error('catch block not called');
  process.exit();
};
