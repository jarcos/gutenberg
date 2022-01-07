/**
 * WordPress dependencies
 */
import {
	useMergeRefs,
	__experimentalUseFixedWindowList as useFixedWindowList,
} from '@wordpress/compose';
import { __experimentalTreeGrid as TreeGrid } from '@wordpress/components';
import { AsyncModeProvider, useDispatch, useSelect } from '@wordpress/data';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useReducer,
	forwardRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { getScrollContainer } from '@wordpress/dom';

/**
 * Internal dependencies
 */
import ListViewBranch, { countBlocks } from './branch';
import { ListViewContext } from './context';
import ListViewDropIndicator from './drop-indicator';
import useListViewClientIds from './use-list-view-client-ids';
import useListViewDropZone from './use-list-view-drop-zone';
import { store as blockEditorStore } from '../../store';

const noop = () => {};
const expanded = ( state, action ) => {
	if ( Array.isArray( action.clientIds ) ) {
		return {
			...state,
			...action.clientIds.reduce(
				( newState, id ) => ( {
					...newState,
					[ id ]: action.type === 'expand',
				} ),
				{}
			),
		};
	}
	return state;
};

const BLOCK_LIST_ITEM_HEIGHT = 36;

/**
 * Wrap `ListViewRows` with `TreeGrid`. ListViewRows is a
 * recursive component (it renders itself), so this ensures TreeGrid is only
 * present at the very top of the navigation grid.
 *
 * @param {Object}   props                                          Components props.
 * @param {Array}    props.blocks                                   Custom subset of block client IDs to be used instead of the default hierarchy.
 * @param {Function} props.onSelect                                 Block selection callback.
 * @param {boolean}  props.showNestedBlocks                         Flag to enable displaying nested blocks.
 * @param {boolean}  props.showBlockMovers                          Flag to enable block movers
 * @param {boolean}  props.__experimentalFeatures                   Flag to enable experimental features.
 * @param {boolean}  props.__experimentalPersistentListViewFeatures Flag to enable features for the Persistent List View experiment.
 * @param {boolean}  props.__experimentalHideContainerBlockActions  Flag to hide actions of top level blocks (like core/widget-area)
 * @param {Object}   ref                                            Forwarded ref
 */
function ListView(
	{
		blocks,
		onSelect = noop,
		__experimentalFeatures,
		__experimentalPersistentListViewFeatures,
		__experimentalHideContainerBlockActions,
		showNestedBlocks,
		showBlockMovers,
		...props
	},
	ref
) {
	const {
		clientIdsTree,
		draggedClientIds,
		selectedClientIds,
		selectedBlockParentClientIds,
	} = useListViewClientIds( blocks );
	const selectedTreeId = useRef( null );
	const { selectBlock } = useDispatch( blockEditorStore );
	const { visibleBlockCount } = useSelect(
		( select ) => {
			const { getGlobalBlockCount, getClientIdsOfDescendants } = select(
				blockEditorStore
			);
			const draggedBlockCount =
				draggedClientIds?.length > 0
					? getClientIdsOfDescendants( draggedClientIds ).length + 1
					: 0;
			return {
				visibleBlockCount: getGlobalBlockCount() - draggedBlockCount,
			};
		},
		[ draggedClientIds ]
	);
	const selectEditorBlock = useCallback(
		( clientId ) => {
			selectBlock( clientId );
			onSelect( clientId );
			selectedTreeId.current = clientId;
		},
		[ selectBlock, onSelect ]
	);
	const [ expandedState, setExpandedState ] = useReducer( expanded, {} );
	const { ref: dropZoneRef, target: blockDropTarget } = useListViewDropZone();
	const elementRef = useRef();
	const treeGridRef = useMergeRefs( [ elementRef, dropZoneRef, ref ] );
	const isMounted = useRef( false );

	useEffect( () => {
		isMounted.current = true;
	}, [] );

	// List View renders a fixed number of items and relies on each having a fixed item height of 36px.
	// If this value changes, we should also change the itemHeight value set in useFixedWindowList.
	// See: https://github.com/WordPress/gutenberg/pull/35230 for additional context.
	const [ fixedListWindow ] = useFixedWindowList(
		elementRef,
		BLOCK_LIST_ITEM_HEIGHT,
		visibleBlockCount,
		{
			useWindowing: __experimentalPersistentListViewFeatures,
			windowOverscan: 40,
		}
	);

	const expand = useCallback(
		( clientId ) => {
			if ( ! clientId ) {
				return;
			}
			setExpandedState( { type: 'expand', clientIds: [ clientId ] } );
		},
		[ setExpandedState ]
	);
	const collapse = useCallback(
		( clientId ) => {
			if ( ! clientId ) {
				return;
			}
			setExpandedState( { type: 'collapse', clientIds: [ clientId ] } );
		},
		[ setExpandedState ]
	);
	const expandRow = useCallback(
		( row ) => {
			expand( row?.dataset?.block );
		},
		[ expand ]
	);
	const collapseRow = useCallback(
		( row ) => {
			collapse( row?.dataset?.block );
		},
		[ collapse ]
	);

	const contextValue = useMemo(
		() => ( {
			__experimentalFeatures,
			__experimentalPersistentListViewFeatures,
			__experimentalHideContainerBlockActions,
			isTreeGridMounted: isMounted.current,
			draggedClientIds,
			expandedState,
			expand,
			collapse,
		} ),
		[
			__experimentalFeatures,
			__experimentalPersistentListViewFeatures,
			__experimentalHideContainerBlockActions,
			isMounted.current,
			draggedClientIds,
			expandedState,
			expand,
			collapse,
		]
	);
	// @TODO create custom hooks.
	useEffect( () => {
		// If the selectedTreeId is the same as the selected block,
		// it means that the block was selected usin the block list tree.
		if ( selectedTreeId.current === selectedClientIds[ 0 ] ) {
			return;
		}

		// If the selected block has parents, get the top-level parent.
		if (
			Array.isArray( selectedBlockParentClientIds ) &&
			selectedBlockParentClientIds.length
		) {
			// If the selected block has parents,
			// expand the tree branch.
			setExpandedState( {
				type: 'expand',
				clientIds: selectedBlockParentClientIds,
			} );
		}

		if ( Array.isArray( selectedClientIds ) && selectedClientIds.length ) {
			const scrollContainer = getScrollContainer( elementRef.current );

			// Grab the selected id. This is the point at which we can
			// stop counting blocks in the tree.
			let selectedId = selectedClientIds[ 0 ];

			// If the selected block has parents, get the top-level parent.
			if (
				Array.isArray( selectedBlockParentClientIds ) &&
				selectedBlockParentClientIds.length
			) {
				selectedId = selectedBlockParentClientIds[ 0 ];
			}

			// Count expanded blocks in the tree up until the selected block,
			// so we can calculate the scroll container top.
			let listItemHeightFactor = 0;
			clientIdsTree.every( ( item ) => {
				if ( item?.clientId === selectedId ) {
					return false;
				}
				listItemHeightFactor += countBlocks( item, expandedState, [] );
				return true;
			} );

			// @TODO if selected block is already visible in the list prevent scroll.
			scrollContainer?.scrollTo( {
				top: listItemHeightFactor * BLOCK_LIST_ITEM_HEIGHT,
			} );
		}
	}, [ selectedClientIds[ 0 ] ] );

	return (
		<AsyncModeProvider value={ true }>
			<ListViewDropIndicator
				listViewRef={ elementRef }
				blockDropTarget={ blockDropTarget }
			/>
			<TreeGrid
				className="block-editor-list-view-tree"
				aria-label={ __( 'Block navigation structure' ) }
				ref={ treeGridRef }
				onCollapseRow={ collapseRow }
				onExpandRow={ expandRow }
			>
				<ListViewContext.Provider value={ contextValue }>
					<ListViewBranch
						blocks={ clientIdsTree }
						selectBlock={ selectEditorBlock }
						showNestedBlocks={ showNestedBlocks }
						showBlockMovers={ showBlockMovers }
						fixedListWindow={ fixedListWindow }
						selectedClientIds={ selectedClientIds }
						{ ...props }
					/>
				</ListViewContext.Provider>
			</TreeGrid>
		</AsyncModeProvider>
	);
}
export default forwardRef( ListView );
