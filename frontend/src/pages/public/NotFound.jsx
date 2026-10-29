import Button from '../../components/common/Button';
import usePageMeta from '../../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta('Bogga lama helin');
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <p className="num font-display text-7xl font-extrabold text-royal">404</p>
        <h1 className="mt-3 text-3xl font-extrabold text-navy">Boggan lama helin</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">Bogga aad raadinayso ma jiro ama waa la raray.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button to="/">Bogga Hore</Button>
          <Button to="/alaabta" variant="outline">
            Eeg Alaabta
          </Button>
        </div>
      </div>
    </div>
  );
}
