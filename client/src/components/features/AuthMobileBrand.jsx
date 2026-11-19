export default function AuthMobileBrand() {
  return (
    <div className="mb-8 lg:hidden">
      <div className="inline-flex items-center gap-2.5 mb-2">
        <img
          src="/bongabong-seal.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 object-contain"
        />
        <span className="text-xl font-bold text-foreground">B-LIS</span>
      </div>
      <p className="text-xs text-muted-foreground">Sangguniang Bayan of Bongabong</p>
    </div>
  );
}
