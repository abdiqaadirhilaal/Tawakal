import { useEffect } from 'react';

// Wuxuu dejiyaa cinwaanka bogga iyo meta description.
export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | TAWAKAL Building Materials` : 'TAWAKAL | Building Materials & Supplies';
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}
