/**
 * Catalyst link wired to React Router, so moving between pages keeps the app state instead of reloading.
 * External and absolute URLs still render a plain anchor.
 */

import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'
import { Link as RouterLink } from 'react-router'

const isExternal = (href: string) => /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')

export const Link = forwardRef(function Link(
  props: { href: string } & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const { href, ...rest } = props
  return (
    <Headless.DataInteractive>
      {isExternal(href) ? <a href={href} {...rest} ref={ref} /> : <RouterLink to={href} {...rest} ref={ref} />}
    </Headless.DataInteractive>
  )
})
