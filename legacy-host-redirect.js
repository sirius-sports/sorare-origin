(() => {
  const legacyHost = "sirius-sports.github.io";
  const legacyBasePath = "/sorare-origin";

  if (window.location.hostname !== legacyHost) {
    return;
  }

  let destinationPath = window.location.pathname;
  if (
    destinationPath === legacyBasePath ||
    destinationPath.startsWith(`${legacyBasePath}/`)
  ) {
    destinationPath = destinationPath.slice(legacyBasePath.length) || "/";
  }

  const destination = new URL(
    `${destinationPath}${window.location.search}${window.location.hash}`,
    "https://sorare.siriusfactor.com"
  );
  window.location.replace(destination.href);
})();
