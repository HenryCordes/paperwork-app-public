import { ResponsiveSizeNote } from "./styled";

const ResponsiveNote: React.FC<{ text: string }> = ({ text }) => {
  const isLong = text.length > 15;

  return (
    <ResponsiveSizeNote isLong={isLong} slot="end">
      {text}
    </ResponsiveSizeNote>
  );
};

export default ResponsiveNote;
