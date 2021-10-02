/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalBoxControl as BoxControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';
import { __experimentalUseCustomSides as useCustomSides } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { useSetting } from '../editor/utils';

const AXIAL_SIDES = [ 'horizontal', 'vertical' ];

export function useHasDimensionsPanel( context ) {
	const hasPadding = useHasPadding( context );
	const hasMargin = useHasMargin( context );
	const hasGap = useHasGap( context );

	return hasPadding || hasMargin || hasGap;
}

function useHasPadding( { name, supports } ) {
	const settings = useSetting( 'spacing.customPadding', name );

	return settings && supports.includes( 'padding' );
}

function useHasMargin( { name, supports } ) {
	const settings = useSetting( 'spacing.customMargin', name );

	return settings && supports.includes( 'margin' );
}

function useHasGap( { name, supports } ) {
	const settings = useSetting( 'spacing.blockGap', name );

	return settings && supports.includes( '--wp--style--block-gap' );
}

function filterValuesBySides( values, sides ) {
	if ( ! sides ) {
		// If no custom side configuration all sides are opted into by default.
		return values;
	}

	// Only include sides opted into within filtered values.
	const filteredValues = {};
	sides.forEach( ( side ) => {
		if ( side === 'vertical' ) {
			filteredValues.top = values.top;
			filteredValues.bottom = values.bottom;
		}
		if ( side === 'horizontal' ) {
			filteredValues.left = values.left;
			filteredValues.right = values.right;
		}
		filteredValues[ side ] = values[ side ];
	} );

	return filteredValues;
}

function filterGapValuesBySides( values, sides ) {
	if ( ! sides ) {
		return {
			row: values?.top,
			column: values?.left,
		};
	}
	const filteredValues = {};
	sides.forEach( ( side ) => {
		if ( side === 'horizontal' ) {
			filteredValues.column = values?.left;
		}
		if ( side === 'vertical' ) {
			filteredValues.row = values?.top;
		}
	} );
	return filteredValues;
}

function splitStyleValue( value ) {
	// Check for shorthand value ( a string value ).
	if ( value && typeof value === 'string' ) {
		// Convert to value for individual sides for BoxControl.
		return {
			top: value,
			right: value,
			bottom: value,
			left: value,
		};
	}

	return value;
}

function splitGapStyleValue( value ) {
	// Check for shorthand value ( a string value ).
	if ( value && typeof value === 'string' ) {
		return {
			top: value,
			right: value,
			bottom: value,
			left: value,
		};
	}
	// Convert rows and columns to individual side values.
	return {
		top: value?.row,
		right: value?.column,
		bottom: value?.row,
		left: value?.column,
	};
}

export default function DimensionsPanel( { context, getStyle, setStyle } ) {
	const { name } = context;
	const showPaddingControl = useHasPadding( context );
	const showMarginControl = useHasMargin( context );
	const showGapControl = useHasGap( context );
	const units = useCustomUnits( {
		availableUnits: useSetting( 'spacing.units', name ) || [
			'%',
			'px',
			'em',
			'rem',
			'vw',
		],
	} );

	const paddingValues = splitStyleValue( getStyle( name, 'padding' ) );
	const paddingSides = useCustomSides( name, 'padding' );
	const isAxialPadding =
		paddingSides &&
		paddingSides.some( ( side ) => AXIAL_SIDES.includes( side ) );

	const setPaddingValues = ( newPaddingValues ) => {
		const padding = filterValuesBySides( newPaddingValues, paddingSides );
		setStyle( name, 'padding', padding );
	};
	const resetPaddingValue = () => setPaddingValues( {} );
	const hasPaddingValue = () =>
		!! paddingValues && Object.keys( paddingValues ).length;

	const marginValues = splitStyleValue( getStyle( name, 'margin' ) );
	const marginSides = useCustomSides( name, 'margin' );
	const isAxialMargin =
		marginSides &&
		marginSides.some( ( side ) => AXIAL_SIDES.includes( side ) );

	const setMarginValues = ( newMarginValues ) => {
		const margin = filterValuesBySides( newMarginValues, marginSides );
		setStyle( name, 'margin', margin );
	};
	const resetMarginValue = () => setMarginValues( {} );
	const hasMarginValue = () =>
		!! marginValues && Object.keys( marginValues ).length;

	const gapValues = splitGapStyleValue(
		getStyle( name, '--wp--style--block-gap' )
	);
	const gapSides = useCustomSides( name, 'blockGap' );
	const isAxialGap =
		gapSides && gapSides.some( ( side ) => AXIAL_SIDES.includes( side ) );

	const setGapValues = ( newGapValues ) => {
		const gap = filterGapValuesBySides( newGapValues, gapSides );
		setStyle( name, '--wp--style--block-gap', gap );
	};
	const resetGapValue = () => setGapValues( {} );
	const hasGapValue = () => !! gapValues && Object.keys( gapValues ).length;

	const resetAll = () => {
		resetPaddingValue();
		resetMarginValue();
		resetGapValue();
	};

	return (
		<ToolsPanel label={ __( 'Dimensions' ) } resetAll={ resetAll }>
			{ showPaddingControl && (
				<ToolsPanelItem
					hasValue={ hasPaddingValue }
					label={ __( 'Padding' ) }
					onDeselect={ resetPaddingValue }
					isShownByDefault={ true }
				>
					<BoxControl
						values={ paddingValues }
						onChange={ setPaddingValues }
						label={ __( 'Padding' ) }
						sides={ paddingSides }
						units={ units }
						allowReset={ false }
						splitOnAxis={ isAxialPadding }
					/>
				</ToolsPanelItem>
			) }
			{ showMarginControl && (
				<ToolsPanelItem
					hasValue={ hasMarginValue }
					label={ __( 'Margin' ) }
					onDeselect={ resetMarginValue }
					isShownByDefault={ true }
				>
					<BoxControl
						values={ marginValues }
						onChange={ setMarginValues }
						label={ __( 'Margin' ) }
						sides={ marginSides }
						units={ units }
						allowReset={ false }
						splitOnAxis={ isAxialMargin }
					/>
				</ToolsPanelItem>
			) }
			{ showGapControl && (
				<ToolsPanelItem
					hasValue={ hasGapValue }
					label={ __( 'Block gap' ) }
					onDeselect={ resetGapValue }
					isShownByDefault={ true }
				>
					<BoxControl
						label={ __( 'Block gap' ) }
						min={ 0 }
						onChange={ setGapValues }
						units={ units }
						values={ gapValues }
						allowReset={ false }
						splitOnAxis={ isAxialGap }
					/>
				</ToolsPanelItem>
			) }
		</ToolsPanel>
	);
}