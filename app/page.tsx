import ProductDashboard from './components/product/ProductDashboard';
import { getProductDashboard } from '../lib/product/queries/getProductDashboard';

export default function Home() {
  return <ProductDashboard model={getProductDashboard()} />;
}
