import Image from 'next/image';

/** A phone frame around an app screenshot. Screenshots are 390×844 @2x (780×1688). */
export function Phone({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`phone ${className}`}>
      <Image src={src} alt={alt} width={390} height={844} className="phone__screen" priority={priority} />
    </div>
  );
}
