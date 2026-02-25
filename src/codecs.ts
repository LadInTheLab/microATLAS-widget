// Must be imported before any zarr data is loaded.
import { addCodec } from 'zarr';
import Zstd from 'numcodecs/zstd';

// zarr.js calls codec.fromConfig() on the class, so pass the class itself.
addCodec(Zstd.codecId, () => Zstd);
