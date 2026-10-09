import { forwardRef } from "react";
import { useRouterState } from "../router";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, children, ...rest }, ref) {
  const router = useRouterState();
  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        router.push(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

export default Link;
