// A project's main picture: an uploaded photo, or one of the built-in drawings.
import { Thumb } from './PhotoGrid';
import { Icon } from './Icon';
import { addPhoto, type Ctx } from '../forms';
import { toast } from '../ui';
import { PHOTO_ACCEPT } from '../images';
import { SCENES } from '../../lib/scene';

type Props = { picture: string; photo: string; folder: string; ctx: Ctx; onChange: (v: { picture: string; photo: string }) => void };

export default function PictureField({ picture, photo, folder, ctx, onChange }: Props) {
  return (
    <div className="ed-picbox">
      <div className="ed-pic">
        <Thumb photo={photo || undefined} picture={picture} />
      </div>
      <div className="ed-pic-tools">
        <label className="ed-btn">
          <Icon name="photo" size={16} /> {photo ? 'Replace photo' : 'Upload photo'}
          <input
            type="file"
            accept={PHOTO_ACCEPT}
            className="ed-file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                onChange({ picture, photo: await addPhoto(file, folder, ctx) });
              } catch (err) {
                toast((err as Error).message, 'error');
              }
            }}
          />
        </label>
        {photo ? (
          <button type="button" className="ed-btn quiet" onClick={() => onChange({ picture, photo: '' })}>
            Use drawing instead
          </button>
        ) : (
          <label className="ed-inline">
            <span className="lab">Drawing</span>
            <select value={picture} onChange={(e) => onChange({ picture: e.target.value, photo })}>
              {SCENES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
